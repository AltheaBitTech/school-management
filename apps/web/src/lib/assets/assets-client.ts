import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'RETIRED';

export type MaintenanceType = 'REPAIR' | 'SERVICE' | 'INSPECTION' | 'OTHER';

export type AssetHistoryEvent =
  | 'CREATED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'TRANSFERRED'
  | 'MAINTENANCE_STARTED'
  | 'MAINTENANCE_COMPLETED'
  | 'RETIRED';

export type AssetCategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface AssetStaffSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
}

export interface AssetStudentSummary {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
}

export interface AssetUserSummary {
  id: string;
  email: string;
}

export interface AssetDepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface AssetCategorySummary {
  id: string;
  name: string;
  code: string;
  status: AssetCategoryStatus;
}

export interface AssetCategory extends AssetCategorySummary {
  createdAt: string;
  updatedAt: string;
}

export interface AssetHistoryEntry {
  id: string;
  eventType: AssetHistoryEvent;
  comment?: string | null;
  actorUserId: string;
  createdAt: string;
  actorUser?: AssetUserSummary;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  maintenanceType: MaintenanceType;
  description: string;
  startedAt: string;
  completedAt?: string | null;
  cost?: number | null;
  vendorName?: string | null;
  remarks?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: AssetUserSummary;
}

export interface AssetTransfer {
  id: string;
  assetId: string;
  fromDepartmentId?: string | null;
  toDepartmentId?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  fromStaffId?: string | null;
  toStaffId?: string | null;
  reason?: string | null;
  transferredByUserId: string;
  transferredAt: string;
  transferredBy?: AssetUserSummary;
}

export interface Asset {
  id: string;
  assetCode: string;
  categoryId: string;
  name: string;
  description?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  qrCode?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  departmentId?: string | null;
  location?: string | null;
  assignedStaffId?: string | null;
  assignedStudentId?: string | null;
  status: AssetStatus;
  retiredAt?: string | null;
  retirementReason?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  category?: AssetCategorySummary;
  department?: AssetDepartmentSummary | null;
  assignedStaff?: AssetStaffSummary | null;
  assignedStudent?: AssetStudentSummary | null;
  createdBy?: AssetUserSummary;
  maintenances?: AssetMaintenance[];
  transfers?: AssetTransfer[];
  history?: AssetHistoryEntry[];
}

interface PaginatedAssetsResponse {
  data: Asset[];
  meta: PaginationMeta;
}

interface AssetResponse {
  data: Asset;
}

interface AssetHistoryResponse {
  data: AssetHistoryEntry[];
}

interface AssetCategoryListResponse {
  data: AssetCategory[];
}

export async function listAssetCategories(): Promise<AssetCategory[]> {
  const response = await apiClient.get<AssetCategoryListResponse>('/assets/categories', {
    auth: true,
  });
  return response.data;
}

export async function listAssets(params?: {
  page?: number;
  pageSize?: number;
  status?: AssetStatus;
  categoryId?: string;
  departmentId?: string;
  assignedStaffId?: string;
  assignedStudentId?: string;
  warrantyAlert?: boolean;
  search?: string;
}): Promise<PaginatedAssetsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId);
  if (params?.assignedStaffId) searchParams.set('assignedStaffId', params.assignedStaffId);
  if (params?.assignedStudentId) searchParams.set('assignedStudentId', params.assignedStudentId);
  if (params?.warrantyAlert) searchParams.set('warrantyAlert', 'true');
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiClient.get<PaginatedAssetsResponse>(`/assets${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getAsset(id: string): Promise<Asset> {
  const response = await apiClient.get<AssetResponse>(`/assets/${id}`, { auth: true });
  return response.data;
}

export async function getAssetHistory(id: string): Promise<AssetHistoryEntry[]> {
  const response = await apiClient.get<AssetHistoryResponse>(`/assets/${id}/history`, {
    auth: true,
  });
  return response.data;
}

export async function createAsset(payload: {
  categoryId: string;
  name: string;
  description?: string;
  serialNumber?: string;
  barcode?: string;
  qrCode?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  departmentId?: string;
  location?: string;
  assignedStaffId?: string;
}): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>('/assets', payload, { auth: true });
  return response.data;
}

export async function updateAsset(
  id: string,
  payload: {
    name?: string;
    description?: string | null;
    serialNumber?: string | null;
    barcode?: string | null;
    qrCode?: string | null;
    purchaseDate?: string | null;
    purchaseCost?: number | null;
    warrantyStartDate?: string | null;
    warrantyEndDate?: string | null;
    location?: string | null;
  },
): Promise<Asset> {
  const response = await apiClient.patch<AssetResponse>(`/assets/${id}`, payload, { auth: true });
  return response.data;
}

export async function assignAsset(
  id: string,
  payload: { staffId?: string; studentId?: string },
): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>(`/assets/${id}/assign`, payload, {
    auth: true,
  });
  return response.data;
}

export async function unassignAsset(id: string): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>(`/assets/${id}/unassign`, {}, { auth: true });
  return response.data;
}

export async function transferAsset(
  id: string,
  payload: {
    departmentId?: string | null;
    location?: string | null;
    staffId?: string | null;
    reason?: string;
  },
): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>(`/assets/${id}/transfer`, payload, {
    auth: true,
  });
  return response.data;
}

export async function startAssetMaintenance(
  id: string,
  payload: {
    maintenanceType: MaintenanceType;
    description: string;
    cost?: number;
    vendorName?: string;
    remarks?: string;
  },
): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>(
    `/assets/${id}/maintenance/start`,
    payload,
    { auth: true },
  );
  return response.data;
}

export async function completeAssetMaintenance(
  id: string,
  maintenanceId: string,
): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>(
    `/assets/${id}/maintenance/${maintenanceId}/complete`,
    {},
    { auth: true },
  );
  return response.data;
}

export async function retireAsset(id: string, payload: { reason: string }): Promise<Asset> {
  const response = await apiClient.post<AssetResponse>(`/assets/${id}/retire`, payload, {
    auth: true,
  });
  return response.data;
}

export function formatAssetStatus(status: AssetStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'ASSIGNED':
      return 'Assigned';
    case 'UNDER_MAINTENANCE':
      return 'Under maintenance';
    case 'RETIRED':
      return 'Retired';
    default:
      return status;
  }
}

export function formatAssetHistoryEvent(eventType: AssetHistoryEvent): string {
  switch (eventType) {
    case 'CREATED':
      return 'Created';
    case 'ASSIGNED':
      return 'Assigned';
    case 'UNASSIGNED':
      return 'Unassigned';
    case 'TRANSFERRED':
      return 'Transferred';
    case 'MAINTENANCE_STARTED':
      return 'Maintenance started';
    case 'MAINTENANCE_COMPLETED':
      return 'Maintenance completed';
    case 'RETIRED':
      return 'Retired';
    default:
      return eventType;
  }
}

export function formatMaintenanceType(type: MaintenanceType): string {
  switch (type) {
    case 'REPAIR':
      return 'Repair';
    case 'SERVICE':
      return 'Service';
    case 'INSPECTION':
      return 'Inspection';
    case 'OTHER':
      return 'Other';
    default:
      return type;
  }
}

export function formatAssetDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

export function formatAssetDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function getAssetStaffDisplayName(staff: AssetStaffSummary): string {
  if (staff.displayName?.trim()) {
    return staff.displayName.trim();
  }

  return `${staff.firstName} ${staff.lastName}`.trim();
}

export function getAssetStudentDisplayName(student: AssetStudentSummary): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }

  return `${student.firstName} ${student.lastName}`.trim();
}

export function isWarrantyActive(asset: Asset): boolean {
  if (!asset.warrantyStartDate || !asset.warrantyEndDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${asset.warrantyStartDate}T00:00:00`);
  const end = new Date(`${asset.warrantyEndDate}T00:00:00`);

  return today >= start && today <= end;
}

export const ASSET_STATUSES: AssetStatus[] = [
  'AVAILABLE',
  'ASSIGNED',
  'UNDER_MAINTENANCE',
  'RETIRED',
];

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  'REPAIR',
  'SERVICE',
  'INSPECTION',
  'OTHER',
];
