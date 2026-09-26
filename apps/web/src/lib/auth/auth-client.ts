import { ApiError } from '@/lib/api/client';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth/session';

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  permissions?: string[];
  organization?: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

interface AuthResponse {
  data: AuthSession;
}

interface MeResponse {
  data: AuthUser;
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiV1BaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

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

export async function login(input: {
  organizationCode: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await authRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function refreshSession(): Promise<AuthSession> {
  const response = await authRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
  });

  setAccessToken(response.data.accessToken);
  return response.data;
}

export async function logout(): Promise<void> {
  await authRequest<void>('/auth/logout', {
    method: 'POST',
  });
  clearAccessToken();
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}

export async function requestPasswordReset(input: {
  organizationCode: string;
  email: string;
}): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCurrentUser(accessToken?: string): Promise<AuthUser> {
  const token = accessToken ?? getAccessToken();

  if (!token) {
    throw new ApiError('Authentication is required', 401);
  }

  const response = await authRequest<MeResponse>('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
