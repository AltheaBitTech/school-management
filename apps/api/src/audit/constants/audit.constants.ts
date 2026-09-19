export const AUDIT_ACTIONS = {
  USER_ROLE_ASSIGNED: 'USER_ROLE_ASSIGNED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITY_TYPES = {
  USER: 'User',
  ROLE: 'Role',
} as const;

export const AUDIT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const AUDIT_ERROR_CODES = {
  INVALID_DATE: 'INVALID_AUDIT_DATE',
  INVALID_DATE_RANGE: 'INVALID_AUDIT_DATE_RANGE',
} as const;
