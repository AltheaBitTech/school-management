import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type FeeReportDateScope = 'ASSIGNED' | 'COLLECTED';
export type StudentFeeStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
export type FeePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';

export interface FeeReportRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  feeStructureId: string;
  feeStructureName: string;
  assignedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: StudentFeeStatus;
  assignedOn: string;
  latestPaymentDate: string | null;
  latestPaymentMethod: FeePaymentMethod | null;
}

export interface FeeReport {
  data: FeeReportRecord[];
  meta: PaginationMeta;
  summary: {
    dateScope: FeeReportDateScope;
    fromDate: string | null;
    toDate: string | null;
    timezone: string;
    dateFilterApplied: boolean;
    totalAssigned: number;
    totalCollected: number;
    totalOutstanding: number;
    pendingAmount: number;
    partiallyPaidAmount: number;
    paidAmount: number;
    assignedFeeCount: number;
    pendingFeeCount: number;
    partiallyPaidFeeCount: number;
    paidFeeCount: number;
    totalPayments: number;
  };
  breakdown: {
    byPaymentMethod: Array<{
      method: FeePaymentMethod;
      paymentCount: number;
      collectedAmount: number;
    }>;
    byFeeStructure: Array<{
      feeStructureId: string;
      feeStructureName: string;
      assignedAmount: number;
      collectedAmount: number;
      outstandingAmount: number;
      feeCount: number;
    }>;
    byStatus: Array<{
      status: StudentFeeStatus;
      feeCount: number;
      assignedAmount: number;
      outstandingAmount: number;
    }>;
  };
}

export async function getFeesReport(params?: {
  startDate?: string;
  endDate?: string;
  dateScope?: FeeReportDateScope;
  feeStructureId?: string;
  studentId?: string;
  status?: StudentFeeStatus;
  paymentMethod?: FeePaymentMethod;
  page?: number;
  pageSize?: number;
}): Promise<FeeReport> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.dateScope) query.set('dateScope', params.dateScope);
  if (params?.feeStructureId) query.set('feeStructureId', params.feeStructureId);
  if (params?.studentId) query.set('studentId', params.studentId);
  if (params?.status) query.set('status', params.status);
  if (params?.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString();
  return apiClient.get<FeeReport>(`/reports/fees${suffix ? `?${suffix}` : ''}`, { auth: true });
}

export function formatFeeReportStatus(status: StudentFeeStatus): string {
  return status.replace(/_/g, ' ');
}

export function formatPaymentMethod(method: FeePaymentMethod): string {
  return method.replace(/_/g, ' ');
}
