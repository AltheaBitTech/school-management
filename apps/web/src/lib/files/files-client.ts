import { getApiV1BaseUrl } from '@/lib/api/config';
import { createApiError } from '@/lib/api/client';
import { getAccessToken } from '@/lib/auth/session';

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
