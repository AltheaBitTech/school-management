import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type VisitorStatus = 'CHECKED_IN' | 'CHECKED_OUT';

export type VisitorHistoryEvent = 'CHECKED_IN' | 'CHECKED_OUT';

export interface VisitorStaffSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
}

export interface VisitorUserSummary {
  id: string;
  email: string;
}

export interface VisitorHistoryEntry {
  id: string;
  eventType: VisitorHistoryEvent;
  comment?: string | null;
  createdAt: string;
  actorUser?: VisitorUserSummary;
}

export interface Visitor {
  id: string;
  visitorCode: string;
  name: string;
  mobile: string;
  organizationName?: string | null;
  vehicleNumber?: string | null;
  purpose: string;
  hostStaffId: string;
  checkInAt: string;
  checkOutAt?: string | null;
  status: VisitorStatus;
  remarks?: string | null;
  photoFileId?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  hostStaff?: VisitorStaffSummary;
  createdBy?: VisitorUserSummary;
  history?: VisitorHistoryEntry[];
}

interface PaginatedVisitorsResponse {
  data: Visitor[];
  meta: PaginationMeta;
}

interface VisitorResponse {
  data: Visitor;
}

interface VisitorHistoryResponse {
  data: VisitorHistoryEntry[];
}

interface VisitorHostStaffResponse {
  data: VisitorStaffSummary[];
}

export function getVisitorHostStaffDisplayName(staff: VisitorStaffSummary): string {
  const display = staff.displayName?.trim();
  if (display) {
    return display;
  }
  return `${staff.firstName} ${staff.lastName}`.trim();
}

export async function listVisitorHostStaff(): Promise<VisitorStaffSummary[]> {
  const response = await apiClient.get<VisitorHostStaffResponse>('/visitors/host-staff', {
    auth: true,
  });
  return response.data;
}

export async function listVisitors(params?: {
  page?: number;
  pageSize?: number;
  status?: VisitorStatus;
  date?: string;
  fromDate?: string;
  toDate?: string;
  hostStaffId?: string;
  search?: string;
}): Promise<PaginatedVisitorsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.date) searchParams.set('date', params.date);
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);
  if (params?.hostStaffId) searchParams.set('hostStaffId', params.hostStaffId);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiClient.get<PaginatedVisitorsResponse>(`/visitors${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getVisitor(id: string): Promise<Visitor> {
  const response = await apiClient.get<VisitorResponse>(`/visitors/${id}`, { auth: true });
  return response.data;
}

export async function getVisitorHistory(id: string): Promise<VisitorHistoryEntry[]> {
  const response = await apiClient.get<VisitorHistoryResponse>(`/visitors/${id}/history`, {
    auth: true,
  });
  return response.data;
}

export interface VisitorRepeatProfile {
  name: string;
  mobile: string;
  organizationName?: string | null;
  vehicleNumber?: string | null;
  photoFileId?: string | null;
  hostStaffId: string;
  lastVisitAt: string | null;
}

export async function lookupVisitorByMobile(mobile: string): Promise<VisitorRepeatProfile | null> {
  const params = new URLSearchParams({ mobile });
  const response = await apiClient.get<{ data: VisitorRepeatProfile | null }>(
    `/visitors/lookup?${params.toString()}`,
    { auth: true },
  );
  return response.data;
}

export async function createVisitor(payload: {
  name: string;
  mobile: string;
  organizationName?: string;
  vehicleNumber?: string;
  purpose: string;
  hostStaffId: string;
  remarks?: string;
  photoFileId?: string;
}): Promise<Visitor> {
  const response = await apiClient.post<VisitorResponse>('/visitors', payload, { auth: true });
  return response.data;
}

export async function getVisitorPass(id: string): Promise<VisitorPass> {
  const response = await apiClient.get<VisitorPassResponse>(`/visitors/${id}/pass`, { auth: true });
  return response.data;
}

export interface VisitorPassOrganization {
  name: string;
  city?: string;
}

export interface VisitorPass {
  visitor: {
    visitorCode: string;
    name: string;
    mobile: string;
    organization?: string | null;
    purpose: string;
    host: string;
    checkInTime: string;
    vehicleNumber?: string | null;
    photoFileId?: string | null;
  };
  organization: VisitorPassOrganization;
  qrCodeDataUrl: string;
  passGeneratedAt: string;
}

interface VisitorPassResponse {
  data: VisitorPass;
}

export async function checkOutVisitor(id: string): Promise<Visitor> {
  const response = await apiClient.post<VisitorResponse>(
    `/visitors/${id}/check-out`,
    {},
    { auth: true },
  );
  return response.data;
}

export function formatVisitorStatus(status: VisitorStatus): string {
  switch (status) {
    case 'CHECKED_IN':
      return 'Checked in';
    case 'CHECKED_OUT':
      return 'Checked out';
    default:
      return status;
  }
}

export function getVisitorStaffDisplayName(staff: VisitorStaffSummary): string {
  if (staff.displayName?.trim()) {
    return staff.displayName.trim();
  }

  return `${staff.firstName} ${staff.lastName}`.trim();
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export const VISITOR_STATUSES: VisitorStatus[] = ['CHECKED_IN', 'CHECKED_OUT'];
