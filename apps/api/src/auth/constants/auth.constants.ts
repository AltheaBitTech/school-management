export const REFRESH_COOKIE_NAME = 'campusops_refresh_token';

export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export enum RefreshRevokeReason {
  Logout = 'LOGOUT',
  LogoutAll = 'LOGOUT_ALL',
  Rotated = 'ROTATED',
  ReuseDetected = 'REUSE_DETECTED',
  Expired = 'EXPIRED',
  PasswordReset = 'PASSWORD_RESET',
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  NO_ASSIGNED_ROLE: 'NO_ASSIGNED_ROLE',
  ROLE_NOT_ASSIGNED: 'ROLE_NOT_ASSIGNED',
  ROLE_REVOKED: 'ROLE_REVOKED',
  CONTEXT_SELECTION_REQUIRED: 'CONTEXT_SELECTION_REQUIRED',
} as const;

export const CONTEXT_SELECTION_PURPOSE = 'context-selection' as const;

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** First-time set-password links (staff, student, and activate-account). */
export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  'If an account exists, a password reset link has been sent.';
