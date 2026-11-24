import { createApiError } from '@/lib/api/client';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { getAccessToken } from '@/lib/auth/session';

export async function downloadReportCsv(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  filename: string,
): Promise<void> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === false) {
      continue;
    }
    searchParams.set(key, String(value));
  }

  const accessToken = getAccessToken();
  const url = `${getApiV1BaseUrl()}${path}?${searchParams.toString()}`;
  const response = await fetch(url, {
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
    throw createApiError(payload, response.status, `Export failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
