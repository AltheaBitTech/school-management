import { getApiV1BaseUrl } from './config';
import { touchSessionActivity } from '@/lib/auth/session-idle';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth/session';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  /** @internal Set by client after a refresh retry. */
  _retriedAfterRefresh?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function tryRefreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiV1BaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { data?: { accessToken?: string } };
    const accessToken = payload.data?.accessToken;
    if (!accessToken) {
      return false;
    }

    setAccessToken(accessToken);
    return true;
  } catch {
    return false;
  }
}

function redirectToLoginAfterSessionLoss(): void {
  clearAccessToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campusops:session-expired'));
    const path = window.location.pathname;
    if (!path.startsWith('/login')) {
      window.location.assign('/login?reason=session_expired');
    }
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, auth = false, _retriedAfterRefresh = false, ...rest } = options;
  const url = `${getApiV1BaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const accessToken = auth ? getAccessToken() : null;

  const response = await fetch(url, {
    ...rest,
    credentials: rest.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.status === 401 && auth && !_retriedAfterRefresh) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retriedAfterRefresh: true });
    }
    redirectToLoginAfterSessionLoss();
  }

  if (auth && response.ok) {
    touchSessionActivity();
  }

  if (!response.ok) {
    const errorPayload = payload as { message?: string; code?: string } | null;
    throw new ApiError(
      errorPayload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorPayload?.code,
    );
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body, auth: options?.auth ?? true }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body, auth: options?.auth ?? true }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body, auth: options?.auth ?? true }),
};
