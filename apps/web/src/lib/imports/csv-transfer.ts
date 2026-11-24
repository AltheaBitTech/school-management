import { createApiError } from '@/lib/api/client';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function postCsvFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${getApiV1BaseUrl()}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: formData,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw createApiError(
      payload as { message?: string | string[]; code?: string; requestId?: string } | null,
      response.status,
      `Request failed with status ${response.status}`,
    );
  }
  return payload as T;
}

export async function downloadAuthenticatedFile(path: string, filename: string): Promise<void> {
  const response = await fetch(`${getApiV1BaseUrl()}${path}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error('The file could not be downloaded');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface ImportFieldError {
  column: string;
  message: string;
}

export interface ImportPreviewRow {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  label: string;
  detail?: string;
  errors: ImportFieldError[];
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: ImportPreviewRow[];
}

export interface ImportCommitRow {
  row: number;
  status: 'imported' | 'error';
  category?: 'validation' | 'duplicate';
  column?: string;
  reason?: string;
  name?: string;
  studentCode?: string;
  employeeCode?: string;
  email?: string;
  inviteUrl?: string;
}

export interface ImportCommitResult {
  imported: number;
  skipped: number;
  duplicateCount?: number;
  rows: ImportCommitRow[];
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildImportErrorReportCsv(rows: ImportCommitRow[]): string {
  const failed = rows.filter((row) => row.status !== 'imported');
  const lines = ['row,outcome,column,reason'];
  for (const row of failed) {
    lines.push(
      [row.row, row.category ?? 'validation', row.column ?? '', csvCell(row.reason)].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function downloadTextFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
