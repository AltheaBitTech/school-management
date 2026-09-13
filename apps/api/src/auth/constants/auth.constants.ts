export const REFRESH_COOKIE_NAME = 'campusops_refresh_token';

export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export enum RefreshRevokeReason {
  Logout = 'LOGOUT',
  LogoutAll = 'LOGOUT_ALL',
  Rotated = 'ROTATED',
  ReuseDetected = 'REUSE_DETECTED',
  Expired = 'EXPIRED',
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
} as const;
