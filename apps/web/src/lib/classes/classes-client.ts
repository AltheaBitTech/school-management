import { apiClient } from '@/lib/api/client';

export type ClassStatus = 'ACTIVE' | 'INACTIVE';

export interface SchoolSection {
  id: string;
  classId: string;
  name: string;
  status: ClassStatus;
  capacity: number | null;
  classTeacherId: string | null;
  classTeacherName: string | null;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  organizationId: string;
  name: string;
  displayOrder: number;
  termCount?: number | null;
  status: ClassStatus;
  sections: SchoolSection[];
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function listClasses(params?: { status?: ClassStatus }): Promise<SchoolClass[]> {
  const query = params?.status ? `?status=${params.status}` : '';
  const response = await apiClient.get<{ data: SchoolClass[] }>(`/classes${query}`, { auth: true });
  return response.data;
}

export async function createClass(input: { name: string; displayOrder?: number; termCount?: number }): Promise<SchoolClass> {
  const response = await apiClient.post<{ data: SchoolClass }>('/classes', input);
  return response.data;
}

export async function updateClass(
  id: string,
  input: { name?: string; displayOrder?: number; termCount?: number | null },
): Promise<SchoolClass> {
  const response = await apiClient.patch<{ data: SchoolClass }>(`/classes/${id}`, input);
  return response.data;
}

export async function setClassActive(id: string, active: boolean): Promise<SchoolClass> {
  const action = active ? 'activate' : 'deactivate';
  const response = await apiClient.post<{ data: SchoolClass }>(`/classes/${id}/${action}`);
  return response.data;
}

export async function createSection(
  classId: string,
  input: { name: string; classTeacherId?: string; capacity?: number },
): Promise<SchoolSection> {
  const response = await apiClient.post<{ data: SchoolSection }>(`/classes/${classId}/sections`, input);
  return response.data;
}

export async function updateSection(
  id: string,
  input: { name?: string; classTeacherId?: string | null; capacity?: number | null },
): Promise<SchoolSection> {
  const response = await apiClient.patch<{ data: SchoolSection }>(`/sections/${id}`, input);
  return response.data;
}

export async function setSectionActive(id: string, active: boolean): Promise<SchoolSection> {
  const action = active ? 'activate' : 'deactivate';
  const response = await apiClient.post<{ data: SchoolSection }>(`/sections/${id}/${action}`);
  return response.data;
}

/** Display label used across student screens, e.g. "Grade 8 - A". */
export function sectionLabel(schoolClass: Pick<SchoolClass, 'name'>, section: Pick<SchoolSection, 'name'>): string {
  return `${schoolClass.name} - ${section.name}`;
}

/** Splits "A, B, C" into unique trimmed names for quick multi-section entry. */
export function parseSectionNames(input: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of input.split(',')) {
    const name = part.trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      names.push(name);
    }
  }
  return names;
}
