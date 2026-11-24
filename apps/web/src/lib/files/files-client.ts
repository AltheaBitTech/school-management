import { ApiError, createApiError } from '@/lib/api/client';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';

/** Matches the API and the Supabase bucket file size limit. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '50 MB';

export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface UploadFileResponse {
  data: UploadedFile;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      `This file is larger than the ${MAX_UPLOAD_LABEL} limit.`,
      413,
      'FILE_TOO_LARGE',
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  const accessToken = getAccessToken();
  const response = await fetch(`${getApiV1BaseUrl()}/files`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      code?: string;
      requestId?: string;
    } | null;
    throw createApiError(payload, response.status, `Upload failed with status ${response.status}`);
  }

  const json = (await response.json()) as UploadFileResponse;
  return json.data;
}

export function fileDownloadUrl(fileId: string): string {
  return `${getApiV1BaseUrl()}/files/${fileId}`;
}

export function complaintAttachmentDownloadUrl(complaintId: string, fileId: string): string {
  return `${getApiV1BaseUrl()}/complaints/${complaintId}/attachments/${fileId}`;
}

export async function downloadComplaintAttachment(
  complaintId: string,
  fileId: string,
  originalName: string,
): Promise<void> {
  const accessToken = getAccessToken();
  const response = await fetch(complaintAttachmentDownloadUrl(complaintId, fileId), {
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      code?: string;
      requestId?: string;
    } | null;
    throw createApiError(payload, response.status, `Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = originalName;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
