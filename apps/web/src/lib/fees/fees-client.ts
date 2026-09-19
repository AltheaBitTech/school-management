import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type FeeStructureStatus = 'ACTIVE' | 'INACTIVE';
export type StudentFeeStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
export type FeePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';

export interface FeeStructure {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  periodStart: string;
  periodEnd: string;
  status: FeeStructureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFee {
  id: string;
  studentId: string;
  feeStructureId: string;
  assignedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate?: string | null;
  status: StudentFeeStatus;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    displayName?: string | null;
  };
  feeStructure?: {
    id: string;
    name: string;
  };
}

export interface FeePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: FeePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface StudentFeeDetail extends StudentFee {
  payments: FeePayment[];
}

export interface StudentFeeSummary {
  studentId: string;
  totalAssigned: number;
  totalPaid: number;
  totalOutstanding: number;
  fees: Array<{
    id: string;
    feeStructureName: string;
    assignedAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    status: StudentFeeStatus;
    dueDate?: string | null;
  }>;
}

interface PaginatedFeeStructuresResponse {
  data: FeeStructure[];
  meta: PaginationMeta;
}

interface PaginatedStudentFeesResponse {
  data: StudentFee[];
  meta: PaginationMeta;
}

interface FeeStructureResponse {
  data: FeeStructure;
}

interface StudentFeeResponse {
  data: StudentFeeDetail;
}

interface StudentFeeSummaryResponse {
  data: StudentFeeSummary;
}

interface RecordFeePaymentResponse {
  data: {
    payment: FeePayment;
    studentFee: StudentFeeDetail;
  };
}

export const FEE_PAYMENT_METHODS: FeePaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'UPI',
  'OTHER',
];

export const STUDENT_FEE_STATUSES: StudentFeeStatus[] = [
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
];

export async function listFeeStructures(params?: {
  page?: number;
  pageSize?: number;
  status?: FeeStructureStatus;
}): Promise<PaginatedFeeStructuresResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiClient.get<PaginatedFeeStructuresResponse>(
    `/fees/structures${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function createFeeStructure(payload: {
  name: string;
  description?: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
}): Promise<FeeStructure> {
  const response = await apiClient.post<FeeStructureResponse>(
    '/fees/structures',
    payload,
    { auth: true },
  );
  return response.data;
}

export async function listStudentFees(params?: {
  page?: number;
  pageSize?: number;
  studentId?: string;
  feeStructureId?: string;
  status?: StudentFeeStatus;
}): Promise<PaginatedStudentFeesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.studentId) searchParams.set('studentId', params.studentId);
  if (params?.feeStructureId) searchParams.set('feeStructureId', params.feeStructureId);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiClient.get<PaginatedStudentFeesResponse>(
    `/fees/student-fees${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function assignStudentFee(payload: {
  studentId: string;
  feeStructureId: string;
  amount?: number;
  dueDate?: string;
}): Promise<StudentFeeDetail> {
  const response = await apiClient.post<StudentFeeResponse>(
    '/fees/student-fees',
    payload,
    { auth: true },
  );
  return response.data;
}

export async function getStudentFee(id: string): Promise<StudentFeeDetail> {
  const response = await apiClient.get<StudentFeeResponse>(`/fees/student-fees/${id}`, {
    auth: true,
  });
  return response.data;
}

export async function recordStudentFeePayment(
  studentFeeId: string,
  payload: {
    amount: number;
    paymentDate: string;
    paymentMethod: FeePaymentMethod;
    reference?: string;
    notes?: string;
  },
): Promise<RecordFeePaymentResponse['data']> {
  const response = await apiClient.post<RecordFeePaymentResponse>(
    `/fees/student-fees/${studentFeeId}/payments`,
    payload,
    { auth: true },
  );
  return response.data;
}

export async function getStudentFeeSummary(studentId: string): Promise<StudentFeeSummary> {
  const response = await apiClient.get<StudentFeeSummaryResponse>(
    `/fees/students/${studentId}/summary`,
    { auth: true },
  );
  return response.data;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatStudentFeeStatus(status: StudentFeeStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'PARTIALLY_PAID':
      return 'Partially paid';
    case 'PAID':
      return 'Paid';
    default:
      return status;
  }
}

export function formatFeePaymentMethod(method: FeePaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'Cash';
    case 'BANK_TRANSFER':
      return 'Bank transfer';
    case 'UPI':
      return 'UPI';
    case 'OTHER':
      return 'Other';
    default:
      return method;
  }
}

export function getStudentDisplayNameFromFee(
  student?: StudentFee['student'],
): string {
  if (!student) return 'Unknown student';
  return student.displayName?.trim() || `${student.firstName} ${student.lastName}`.trim();
}

export function formatFeeDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}
