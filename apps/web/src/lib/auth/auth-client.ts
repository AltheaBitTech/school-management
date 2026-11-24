import { ApiError, createApiError } from '@/lib/api/client';
import { getApiV1BaseUrl } from '@/lib/api/config';
import type { InstitutionType, Terminology } from '@/lib/terminology/terminology';
import { clearAccessToken, getAccessToken, setAccessExpiry, setAccessToken } from '@/lib/auth/session';

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  permissions?: string[];
  features?: {
    attendanceEnabled: boolean;
  };
  organization?: {
    id: string;
    name: string;
    code: string;
    status: string;
    institutionType?: InstitutionType;
    terminology?: Terminology;
  };
  staff?: {
    firstName: string;
    lastName: string;
    displayName?: string | null;
  };
  role?: {
    name: string;
    code?: string;
  };
  studentId?: string;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface LoginRoleOption {
  id: string;
  code: string;
  name: string;
}

export interface LoginContextSelection {
  contextSelectionRequired: true;
  selectionToken: string;
  expiresIn: number;
  roles: LoginRoleOption[];
}

export type LoginResult = AuthSession | LoginContextSelection;

export function isAuthSession(result: LoginResult): result is AuthSession {
  return 'accessToken' in result && typeof result.accessToken === 'string' && result.accessToken.length > 0;
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
    throw createApiError(
      payload as { message?: string; code?: string; requestId?: string } | null,
      response.status,
      `Request failed with status ${response.status}`,
    );
  }

  return payload as T;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const response = await authRequest<{ data: LoginResult }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!isAuthSession(response.data)) {
    return response.data;
  }

  setAccessToken(response.data.accessToken);
  setAccessExpiry(response.data.expiresIn);
  return response.data;
}

export async function selectLoginContext(input: {
  selectionToken: string;
  roleId: string;
}): Promise<AuthSession> {
  const response = await authRequest<AuthResponse>('/auth/login/context', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  setAccessToken(response.data.accessToken);
  setAccessExpiry(response.data.expiresIn);
  return response.data;
}

export async function refreshSession(): Promise<AuthSession> {
  const response = await authRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
  });

  setAccessToken(response.data.accessToken);
  setAccessExpiry(response.data.expiresIn);
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
